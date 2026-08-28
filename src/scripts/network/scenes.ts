// The network visualization's content, as data — one shared renderer
// (render.ts) turns any of these into SVG, the same way ascii/scenes.js
// supplies scene functions to one shared GLSL pipeline. Positions are
// hand-authored per scene rather than laid out by a force simulation: at
// six scenes total there is no "hairball" to solve, and a curated layout
// reads as an actual diagram instead of a physics accident.
//
// Levels follow the OSI/TCP-IP stack, taught top-down (Kurose & Ross'
// ordering, matched independently by the source video's own advice to
// learn by watching packets rather than memorizing seven layer names):
// Big Picture -> Application -> Transport -> Network -> Data Link ->
// Physical ("Level 0"). Each scene but the last carries one distinguished
// "descend" node (drillInto set) that moves one level deeper; Level 0 is
// the floor, so it has none.

export interface NetNode {
  id: string;
  label: string;
  kind: 'device' | 'concept' | 'attacker';
  x: number;
  y: number;
  /** Shown in the detail panel when this node is focused or clicked. */
  caption: string;
  /** Id of the scene this node descends into, if any. */
  drillInto?: string;
  /** Mounts an embedded interactive tool below the caption, if set. */
  tool?: 'subnet';
  /** Shown in the detail panel, behind the "Show ethical-hacking relevance" toggle. */
  security?: string;
}

export interface NetEdge {
  from: string;
  to: string;
}

export interface NetScene {
  id: string;
  /** OSI/TCP-IP level this scene represents, or null for the entry view. */
  level: number | null;
  title: string;
  /** Short framing copy shown above the diagram when the scene loads. */
  intro: string;
  nodes: NetNode[];
  edges: NetEdge[];
  /** Id of the scene one level up — drives the breadcrumb trail. */
  parent?: string;
}

export const ENTRY_SCENE_ID = 'entry';

export const SCENES: Record<string, NetScene> = {
  entry: {
    id: 'entry',
    level: null,
    title: 'The Big Picture',
    intro:
      'Every request you send crosses this chain. It looks simple from here — five boxes, four lines. Click Your Device to see what is actually happening underneath.',
    nodes: [
      {
        id: 'you',
        label: 'Your Device',
        kind: 'device',
        x: 90,
        y: 220,
        caption:
          'Where every request starts — a browser, an app, a phone. Everything below happens because this device wants to talk to another one.',
        drillInto: 'l4',
      },
      {
        id: 'router',
        label: 'Home Router',
        kind: 'device',
        x: 270,
        y: 220,
        caption:
          "Your local gateway — a switch, a Wi-Fi access point, and a router bundled into one box. Each of those roles shows up again later, as a separate device, at a different level.",
      },
      {
        id: 'isp',
        label: 'ISP',
        kind: 'device',
        x: 450,
        y: 220,
        caption:
          'Your internet service provider — the first hop onto the actual internet backbone, and usually where your traffic leaves any network you control.',
      },
      {
        id: 'internet',
        label: 'The Internet',
        kind: 'concept',
        x: 630,
        y: 220,
        caption:
          'Not one network — thousands of independently-run networks agreeing to forward each other’s traffic. No single company owns it.',
      },
      {
        id: 'server',
        label: 'Destination Server',
        kind: 'device',
        x: 790,
        y: 220,
        caption:
          "The machine actually hosting whatever you're trying to reach — a website, a game server, anything with an IP address.",
      },
    ],
    edges: [
      { from: 'you', to: 'router' },
      { from: 'router', to: 'isp' },
      { from: 'isp', to: 'internet' },
      { from: 'internet', to: 'server' },
    ],
  },

  l4: {
    id: 'l4',
    level: 4,
    title: 'Level 4 — Application',
    intro:
      'This is the layer you actually see: browsers, apps, and the protocols they speak. Nothing here knows or cares how the bits get there — that is every layer below.',
    parent: 'entry',
    nodes: [
      {
        id: 'browser',
        label: 'Your Browser',
        kind: 'device',
        x: 200,
        y: 140,
        caption: 'Speaks HTTP or HTTPS. To the browser, "the internet" is just: send a request, get a response.',
      },
      {
        id: 'dns',
        label: 'DNS Server',
        kind: 'device',
        x: 440,
        y: 140,
        caption:
          'Translates the name you typed into the IP address that actually gets routed. Without this step, nothing below knows where to send anything.',
        security:
          'DNS spoofing/cache poisoning turns a trusted domain into an attacker-controlled IP — the redirect is often just the delivery mechanism for a phishing page, not the attack itself. The victim typed the right address; the answer that came back was the lie.',
      },
      {
        id: 'webserver',
        label: 'Web Server',
        kind: 'device',
        x: 680,
        y: 140,
        caption:
          'Receives the HTTP request and sends back the page — completely unaware of the ARP broadcasts, TCP handshakes, and router hops that got it there.',
        security:
          'The Server response header and default error pages often reveal exact software and version — recon before anyone looks up a matching exploit. Stripping or genericizing that header is cheap, and still skipped constantly.',
      },
      {
        id: 'descend-l3',
        label: 'Transport',
        kind: 'concept',
        x: 440,
        y: 360,
        caption:
          'Before any of this can happen, the browser needs a reliable connection to send it over. That is Level 3.',
        drillInto: 'l3',
      },
    ],
    edges: [
      { from: 'browser', to: 'dns' },
      { from: 'browser', to: 'webserver' },
      { from: 'browser', to: 'descend-l3' },
    ],
  },

  l3: {
    id: 'l3',
    level: 3,
    title: 'Level 3 — Transport',
    intro:
      'Now it gets real: your request needs a reliable, ordered connection to the right program on the destination machine — not just the right computer.',
    parent: 'l4',
    nodes: [
      {
        id: 'device-src',
        label: 'Your Device',
        kind: 'device',
        x: 140,
        y: 140,
        caption:
          'The client in this connection — same device as the Big Picture, now asking a specific machine to open a conversation on a specific port.',
      },
      {
        id: 'device-dst',
        label: 'Web Server',
        kind: 'device',
        x: 740,
        y: 140,
        caption: 'The server in this connection — already listening, waiting for exactly this kind of request to arrive.',
      },
      {
        id: 'port-src',
        label: 'Source Port',
        kind: 'concept',
        x: 140,
        y: 260,
        caption:
          'A random high-numbered port your OS picks for this one conversation — a return address that only exists for the duration of the call.',
      },
      {
        id: 'port-dst',
        label: 'Destination Port 443',
        kind: 'concept',
        x: 740,
        y: 260,
        caption:
          'The "apartment number" at the destination IP. Port 443 means HTTPS is expected here — the web server software is what is actually listening on it.',
        security:
          "This is exactly what Nmap is probing for. A SYN scan sends the opening handshake packet to a range of ports and reads what comes back — SYN-ACK means something's listening, RST means it isn't — without ever finishing the handshake or leaving a full connection in anyone's logs.",
      },
      {
        id: 'udp',
        label: 'UDP (the other option)',
        kind: 'concept',
        x: 790,
        y: 200,
        caption:
          'No handshake, no guarantee of delivery — just send it. Used when speed matters more than certainty, like live video or DNS itself.',
        security:
          "No handshake also means no reliable way to verify a packet's source — the basis for reflection/amplification DDoS, where a small spoofed request to an open resolver comes back many times larger, aimed at whoever's address got forged. UDP port scans exist too, just noisier: no SYN/RST to read, only silence or an ICMP error.",
      },
      {
        id: 'descend-l2',
        label: 'Network',
        kind: 'concept',
        x: 440,
        y: 360,
        caption:
          'A port only means anything once the packet has actually arrived at the right machine. That is Level 2.',
        drillInto: 'l2',
      },
    ],
    edges: [
      { from: 'device-src', to: 'port-src' },
      { from: 'device-dst', to: 'port-dst' },
      { from: 'device-src', to: 'device-dst' },
      { from: 'device-src', to: 'descend-l2' },
    ],
  },

  l2: {
    id: 'l2',
    level: 2,
    title: 'Level 2 — Network',
    intro: 'This is the layer that gets a packet from your machine to a machine anywhere else on Earth — one router hop at a time.',
    parent: 'l3',
    nodes: [
      {
        id: 'ip',
        label: 'IP Address',
        kind: 'concept',
        x: 160,
        y: 140,
        caption:
          "The \"street address\" of a device on a network — globally unique, or translated to look that way, so a router anywhere can decide which direction to forward you.",
        security:
          "Nothing in the IP header proves the source address is real — it's just a field the sender fills in, unchecked by default. Spoofed source addresses can bypass IP-based access rules, frame another machine for an attack, or feed the reflection-style floods that abuse connectionless protocols with nobody double-checking who's really asking.",
      },
      {
        id: 'router1',
        label: 'Your Router',
        kind: 'device',
        x: 400,
        y: 140,
        caption:
          'Reads the destination IP, checks its routing table, and forwards the packet toward the next router — never the whole path, just the next hop.',
        security:
          'Consumer and small-business routers are still routinely left on factory admin credentials — a password printed right on the case, or just "admin" for both fields. Whoever controls this box controls DNS for the whole network, controls what gets port-forwarded in, and sees every device that joins it.',
      },
      {
        id: 'subnet',
        label: 'Subnetting',
        kind: 'concept',
        x: 640,
        y: 140,
        caption:
          'A subnet mask splits an IP address into a network part and a host part — it is what lets a router instantly know "is this destination on my local network, or do I need to forward it?" Drag the slider below to see what changing that split actually does.',
        tool: 'subnet',
        security:
          'Scoping an engagement often starts here: the client hands over a CIDR block, and everything outside that boundary is off-limits by contract, not just convenience. The same math that defines a subnet\'s boundary is what a tool like Nmap uses to ping-sweep every live host inside it in one pass — same slider, different intent.',
      },
      {
        id: 'router2',
        label: 'ISP Router',
        kind: 'device',
        x: 560,
        y: 260,
        caption:
          "The next router in line, usually the first one you don't own — same job as Your Router: read the address, check the table, forward it one hop closer.",
      },
      {
        id: 'router3',
        label: 'One More Hop',
        kind: 'device',
        x: 800,
        y: 260,
        caption:
          "Real paths often run ten hops or more between you and the destination. traceroute prints every single one — the job never changes, only the number of times it repeats.",
      },
      {
        id: 'descend-l1',
        label: 'Data Link',
        kind: 'concept',
        x: 440,
        y: 360,
        caption:
          'An IP address only matters on the wider internet. On your own local network segment, machines find each other a completely different way. That is Level 1.',
        drillInto: 'l1',
      },
    ],
    edges: [
      { from: 'ip', to: 'router1' },
      { from: 'router1', to: 'subnet' },
      { from: 'router1', to: 'router2' },
      { from: 'router2', to: 'router3' },
      { from: 'router1', to: 'descend-l1' },
    ],
  },

  l1: {
    id: 'l1',
    level: 1,
    title: 'Level 1 — Data Link',
    intro:
      'Zoom all the way into your own local network. Here, nobody uses IP addresses to find each other — they use hardware addresses, and they ask out loud.',
    parent: 'l2',
    nodes: [
      {
        id: 'arp-asker',
        label: 'Your Laptop',
        kind: 'device',
        x: 200,
        y: 60,
        caption: "Has an IP address for the device it wants to reach, but not a MAC address yet — and a frame can't be sent without one.",
      },
      {
        id: 'arp-target',
        label: 'Your Router',
        kind: 'device',
        x: 680,
        y: 60,
        caption:
          "Same box as Your Router in the Network level — different job here. On this segment, it answers to its MAC address, not its IP.",
      },
      {
        id: 'mac',
        label: 'MAC Address',
        kind: 'concept',
        x: 160,
        y: 140,
        caption:
          "A hardware address burned into every network card. Unlike an IP, it isn't about location — it's a fixed serial number for that specific device.",
        security:
          'A network card in promiscuous mode captures every frame on the segment, not just the ones addressed to its own MAC — this is how Wireshark sees traffic that was never meant for that machine. A modern switch limits this to whatever traffic the switch actually sends your way; a hub, or shared Wi-Fi, hands over everything.',
      },
      {
        id: 'switch',
        label: 'Switch',
        kind: 'device',
        x: 400,
        y: 140,
        caption: 'Learns which device is on which physical port by watching traffic, then forwards frames only to the right port — nowhere else.',
        security:
          "A switch's MAC address table only holds so many entries. Flood it with more forged source MACs than it can track — a MAC flooding attack — and some switches fail open, broadcasting every frame to every port like a hub instead of just the right one, handing promiscuous-mode capture back its old advantage.",
      },
      {
        id: 'ap',
        label: 'Wireless Access Point',
        kind: 'device',
        x: 640,
        y: 140,
        caption: 'Does the same job as a switch, but for Wi-Fi — bridges radio frames onto the wired network.',
        security:
          "Nothing forces a device to cryptographically verify the access point it's joining — plenty of devices auto-join any network name they've connected to before, no prompt, no warning. A rogue AP broadcasting that same familiar name only has to be in range and slightly stronger than the real one to win that race.",
      },
      {
        id: 'attacker',
        label: 'Attacker',
        kind: 'attacker',
        x: 280,
        y: 260,
        caption:
          "Another device on the exact same local segment — plugged into the same switch as everyone else here. ARP has no built-in way to check who's telling the truth, so nothing stops this device from answering too. Click \"See it get spoofed\" below to watch what happens when it does.",
      },
      {
        id: 'descend-l0',
        label: 'Physical',
        kind: 'concept',
        x: 440,
        y: 360,
        caption: 'A frame with the right MAC address still has to travel as actual electricity, light, or radio. That is Level 0 — the bottom.',
        drillInto: 'l0',
      },
    ],
    edges: [
      { from: 'mac', to: 'switch' },
      { from: 'switch', to: 'ap' },
      { from: 'switch', to: 'arp-asker' },
      { from: 'switch', to: 'arp-target' },
      { from: 'arp-asker', to: 'arp-target' },
      { from: 'switch', to: 'attacker' },
      { from: 'switch', to: 'descend-l0' },
    ],
  },

  l0: {
    id: 'l0',
    level: 0,
    title: 'Level 0 — Physical',
    intro: 'The bottom of the stack. No addresses, no protocols — just a signal. Everything you just walked through eventually becomes this.',
    parent: 'l1',
    nodes: [
      {
        id: 'copper',
        label: 'Copper Cable',
        kind: 'device',
        x: 200,
        y: 160,
        caption: 'An Ethernet cable carries your data as changes in electrical voltage — literally pulses on a wire.',
        security:
          "A cable doesn't need to be cut to be tapped — an inductive tap or a cheap in-line splitter reads the signal without interrupting it, and without tripping whatever alert would fire if the link actually dropped.",
      },
      {
        id: 'fiber',
        label: 'Fiber Optic',
        kind: 'device',
        x: 440,
        y: 160,
        caption: 'Carries data as pulses of light through glass — what most of the actual internet backbone runs on, hop to hop, ocean to ocean.',
        security:
          "Fiber is harder to tap invisibly than copper — splicing one in usually causes a measurable dip in signal strength — but it isn't immune: a sharp enough bend in the cable leaks light that can be read from outside it.",
      },
      {
        id: 'radio',
        label: 'Radio Waves',
        kind: 'device',
        x: 680,
        y: 160,
        caption: 'Wi-Fi and cellular skip the cable entirely — the same 1s and 0s, encoded as radio signals through open air.',
        security:
          'Radio is inherently broadcast — anyone with an antenna in range receives the same signal, encrypted or not. WPA2/WPA3 encrypts the payload, but plenty of networks still run open, and even encrypted ones leak metadata: which devices are talking, how often, and roughly how much.',
      },
      {
        id: 'nic',
        label: 'Network Interface Card',
        kind: 'device',
        x: 440,
        y: 340,
        caption: 'The physical hardware in every device that actually converts your data into one of the above, and back again on the way in.',
      },
    ],
    edges: [
      { from: 'nic', to: 'copper' },
      { from: 'nic', to: 'fiber' },
      { from: 'nic', to: 'radio' },
    ],
  },
};
