"""Unit tests for the Cipher Console pure transform() — stdlib only.

Run from the repo root:

    python3 -m unittest discover -s tests

Imports api/cipher.py directly; importing it has no side effects (the HTTP
handler class is defined but never instantiated).
"""
import binascii
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from cipher import OPS, transform  # noqa: E402


class RoundTripTests(unittest.TestCase):
    """Encoding then decoding returns the original text for every op."""

    SAMPLES = ["hello world", "Operator 7", "tabs\tand\nnewlines", "café ☕ — ünïçödé"]

    def test_base64_round_trip(self):
        for text in self.SAMPLES:
            encoded = transform("base64", "encode", text)
            self.assertEqual(transform("base64", "decode", encoded), text)

    def test_hex_round_trip(self):
        for text in self.SAMPLES:
            encoded = transform("hex", "encode", text)
            self.assertEqual(transform("hex", "decode", encoded), text)

    def test_url_round_trip(self):
        for text in self.SAMPLES:
            encoded = transform("url", "encode", text)
            self.assertEqual(transform("url", "decode", encoded), text)

    def test_rot13_is_self_inverse(self):
        for text in self.SAMPLES:
            once = transform("rot13", "encode", text)
            self.assertEqual(transform("rot13", "encode", once), text)


class KnownVectorTests(unittest.TestCase):
    """Spot-check a few fixed encodings so regressions are obvious."""

    def test_base64_known(self):
        self.assertEqual(transform("base64", "encode", "operator"), "b3BlcmF0b3I=")

    def test_hex_known(self):
        self.assertEqual(transform("hex", "encode", "AB"), "4142")

    def test_rot13_known(self):
        self.assertEqual(transform("rot13", "encode", "Cipher"), "Pvcure")

    def test_url_encodes_reserved_chars(self):
        self.assertEqual(transform("url", "encode", "a b&c"), "a%20b%26c")

    def test_hex_decode_tolerates_whitespace(self):
        self.assertEqual(transform("hex", "decode", "  4142  "), "AB")


class ErrorTests(unittest.TestCase):
    """Bad input raises the exceptions the HTTP handler catches (400s)."""

    def test_unknown_op_raises_value_error(self):
        with self.assertRaises(ValueError):
            transform("caesar", "encode", "x")

    def test_invalid_base64_raises(self):
        with self.assertRaises(binascii.Error):
            transform("base64", "decode", "not*valid*base64")

    def test_invalid_hex_raises_value_error(self):
        with self.assertRaises(ValueError):
            transform("hex", "decode", "zz")


class ContractTests(unittest.TestCase):
    def test_ops_advertised_match_implementation(self):
        # Every advertised op must encode without raising on plain ASCII.
        for op in OPS:
            self.assertIsInstance(transform(op, "encode", "test"), str)


if __name__ == "__main__":
    unittest.main()
