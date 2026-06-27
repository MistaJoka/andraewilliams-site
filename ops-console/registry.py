_collectors = []


def register(collector):
    _collectors.append(collector)


def all_collectors():
    return list(_collectors)


def clear():
    _collectors.clear()
