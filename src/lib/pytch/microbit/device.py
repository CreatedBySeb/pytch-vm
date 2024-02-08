from collections import namedtuple
import re

from ..syscalls import (
    _microbit_send,
)

BRIGHTNESS_RANGE = range(0, 10)
IMAGE_COORD_RANGE = range(0, 5)
IMAGE_REGEX = re.compile(r"(\d{5}:){4}\d{5}")
NOTE_REGEX = re.compile(r"[a-gA-GrR](b|#)?\d?(:\d)?")
NUMERIC_VARS = ("temp", "accel", "light")
VALID_VARS = ("buttons", "temp", "accel", "gesture", "light", "pins")


def _get_variable(name: str) -> list:
    if name not in VALID_VARS:
        raise ValueError("'" + name + "' is not a valid variable")

    values = _microbit_send("var", [name])

    if name in NUMERIC_VARS:
        return [float(value) for value in values]

    return values

class Acceleration(namedtuple("Acceleration", ["x", "y", "z"])):
    @property
    def magnitude(self) -> float:
        return (self.x ** 2 + self.y ** 2 + self.z ** 2) ** (1/2)

class Buttons(namedtuple("Buttons", ["a", "b", "logo"])):
    @property
    def any(self) -> bool:
        return self.a or self.b or self.logo

class Image:
    def __init__(self, *rows):
        if len(rows) != 5:
            raise ValueError("You must provide 5 rows for an image")

        if not all(len(row) == 5 for row in rows):
            raise ValueError("All image rows must have exactly 5 values")

        if not all(
            all(pixel in BRIGHTNESS_RANGE for pixel in row)
            for row in rows
        ):
            raise ValueError("All pixel values must be between 0 and 9")

        self._rows = rows

    def __getitem__(self, key):
        return self._rows[key]

    def __setitem__(self, key, row):
        if len(row) != 5:
            raise ValueError("Image row must have exactly 5 values")

        if not all(pixel in BRIGHTNESS_RANGE for pixel in row):
            raise ValueError("Pixel values must be between 0 and 9")

        self._rows[key] = row

    def __str__(self):
        return ":".join("".join([str(pixel) for pixel in row]) for row in self._rows)

class Device:
    @property
    def acceleration(self):
        return Acceleration(*_get_variable("accel"))

    @property
    def buttons(self):
        return Buttons(*_get_variable("buttons"))

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

def play_music(notes: list, tempo: int = 120, loop: bool = False):
    """(NOTES, TEMPO, LOOP) Play NOTES at TEMPO beats per minute, continuously if LOOP is True, TEMPO defaults to 120, LOOP defaults to False"""
    if not all(NOTE_REGEX.match(note) for note in notes):
        raise ValueError("All notes must follow the format <note>(octave)(:hold)")

    _microbit_send("play_music", [str(tempo), " ".join(notes), str(loop)])

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
    if x not in IMAGE_COORD_RANGE:
        raise ValueError("x value must be between 0 and 4")
    if y not in IMAGE_COORD_RANGE:
        raise ValueError("y value must be between 0 and 4")
    if brightness not in BRIGHTNESS_RANGE:
        raise ValueError("brightness value must be between 0 and 9")

    _microbit_send("pixel", [str(arg) for arg in [x, y, brightness]])

def show_image(image):
    """(IMAGE) Show IMAGE on the micro:bit's display"""
    if isinstance(image, Image):
        image = str(image)
    elif not isinstance(image, str):
        raise ValueError("Image value must be an Image object or string")
    elif not IMAGE_REGEX.match(image):
        raise ValueError(
            "Image string must be of the form XXXXX:XXXXX:XXXXX:XXXXX:XXXXX, "
            "where X is a number between 1 and 9"
        )

    _microbit_send("show_image", [image])

def show_text(text: str):
    """(TEXT) Show TEXT on the micro:bit's display, character by character"""
    _microbit_send("show_text", [text])

def stop_music():
    """() Stops any currently playing music"""
    _microbit_send("stop_music", [])
