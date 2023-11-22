from collections import namedtuple
import re

from ..syscalls import (
    _microbit_send,
)

IMAGE_REGEX = re.compile(r"(\d{5}:){4}\d{5}")
NUMERIC_VARS = ("temp", "accel", "light")
VALID_VARS = ("buttons", "temp", "accel", "gesture", "light", "pins")


def _get_variable(name: str) -> list:
    if name not in VALID_VARS:
        raise ValueError("'" + name + "' is not a valid variable")

    values = _microbit_send("var", [name])

    if name in NUMERIC_VARS:
        return [float(value) for value in values]

    return values

Acceleration = namedtuple("Acceleration", ["x", "y", "z"])

class Device:
    @property
    def acceleration(self):
        return Acceleration(*_get_variable("accel"))

    @property
    def buttons(self):
        [a, b] = _get_variable("buttons")
        return {"a": a, "b": b}

    @property
    def gesture(self):
        return _get_variable("gesture")[0]

    @property
    def light(self):
        return _get_variable("light")[0]

    @property
    def pins(self):
        return _get_variable("pins")

    @property
    def temperature(self):
        return _get_variable("temp")[0]

device = Device()

def clear_display():
    """() Clear the micro:bit's display"""
    _microbit_send("clear", [])

def scroll_message(message: str):
    """(MESSAGE) Scroll MESSAGE across the micro:bit's display"""
    _microbit_send("scroll", [message])

def set_pin(pin: int, value: bool):
    """(PIN, HIGH) Set PIN to VALUE"""
    if pin not in range(0, 3):
        raise ValueError("pin must be between 0 and 2")

    _microbit_send("write_digital", [str(arg) for arg in [pin, value]])

def set_pixel(x: int, y: int, brightness: int = 9):
    """(X, Y, BRIGHTNESS) Set pixel at X and Y to BRIGHTNESS level, between 1 and 9"""
    if x not in range(0, 5):
        raise ValueError("x value must be between 0 and 4")
    if y not in range(0, 5):
        raise ValueError("y value must be between 0 and 4")
    if brightness not in range(0, 10):
        raise ValueError("brightness value must be between 0 and 9")

    _microbit_send("pixel", [str(arg) for arg in [x, y, brightness]])

def show_image(image: str):
    """(IMAGE) Show IMAGE on the micro:bit's display"""
    if not IMAGE_REGEX.match(image):
        raise ValueError(
            "image must be of the form XXXXX:XXXXX:XXXXX:XXXXX:XXXXX, "
            "where X is a number between 1 and 9"
        )

    _microbit_send("show_image", [image])

def show_text(text: str):
    """(TEXT) Show TEXT on the micro:bit's display, character by character"""
    _microbit_send("show_text", [text])
