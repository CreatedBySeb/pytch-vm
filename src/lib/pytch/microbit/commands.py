from ..syscalls import (
    _get_microbit_rev,
    _microbit_send,
)

from .validation import BRIGHTNESS, DIGITAL_VALUES, PINS, PIXELS, RangeError


class Image:
    "(ROW_1, ROW_2, ...) Define images for the micro:bit display as rows of pixels"

    def __init__(self, *rows):
        if len(rows) != 5:
            raise TypeError("Must pass 5 arrays of pixels to Image")

        if any(len(row) != 5 for row in rows):
            raise ValueError("All arrays must contain 5 values")

        if any(any(not isinstance(p, int) for p in row) for row in rows):
            raise TypeError("All array values must be ints")

        if any(any(p not in BRIGHTNESS for p in row) for row in rows):
            raise RangeError("All array values", BRIGHTNESS)

        self._rows = rows

    def __getitem__(self, index):
        if index not in PIXELS:
            raise RangeError("Row indexes", PIXELS)

        return self._rows[index]

    def __setitem__(self, index, row):
        if index not in PIXELS:
            raise RangeError("Row indexes", PIXELS)

        if len(row) != 5:
            raise ValueError("Row arrays must contain 5 values")

        if any(not isinstance(p, int) for p in row):
            raise ValueError("Row array values must be ints")

        if any(p not in BRIGHTNESS for p in row):
            raise RangeError("Row array values", BRIGHTNESS)

        self._rows[index] = row

    def __str__(self):
        return ":".join("".join(str(p) for p in row) for row in self._rows)


def _get_var(var: str):
    return _microbit_send("var", [var])


def clear_display():
    "() Clear the micro:bit's display"

    _microbit_send("clear")


def play_music(song: str, wait: bool = False, loop: bool = False):
    "(SONG) Plays SONG using the micro:bit's speaker"

    if _get_microbit_rev() != 2:
        raise SystemError("'play_music' is only supported on a V2 micro:bit")

    # Songs are too complex to check on our side, so we defer to the micro:bit
    if not isinstance(song, str):
        raise TypeError("song must be a string")

    _microbit_send("play_music", [song, wait, loop])


def scroll_text(text: str, wait: bool = False, loop: bool = False):
    "(TEXT) Scroll TEXT across the micro:bit's display"

    if not isinstance(text, str):
        raise TypeError("text must be a string")

    _microbit_send("scroll", [text, wait, loop])


def set_pixel(x: int, y: int, brightness: int = 9):
    "(X, Y) Sets the pixel at X, Y on the micro:bit's display"

    if not isinstance(x, int) or not isinstance(y, int):
        raise TypeError("x and y must be ints")

    if x not in PIXELS or y not in PIXELS:
        raise RangeError("x and y", PIXELS)

    if brightness not in BRIGHTNESS:
        raise RangeError("brightness", BRIGHTNESS)

    _microbit_send("pixel", [x, y, brightness])


def show_image(image):
    "(IMAGE) Show IMAGE on the micro:bit's display"
    if isinstance(image, Image):
        image = str(image)

    _microbit_send("show_img", [image])


def show_text(text: str, wait: bool = False, loop: bool = False):
    "(TEXT) Show TEXT on the micro:bit's display, one letter at a time"

    if not isinstance(text, str):
        raise TypeError("text must be a string")

    _microbit_send("show_text", [text, wait, loop])


def stop_music():
    "() Stops any currently playing music on the micro:bit"

    if _get_microbit_rev() != 2:
        raise SystemError("'stop_music' is only supported on a V2 micro:bit")

    _microbit_send("stop_music")


def write_digital(pin: int, value: int):
    "(PIN, VALUE) Sets PIN on the micro:bit to output VALUE as a digital signal"

    if not isinstance(pin, int) or not isinstance(value, int):
        raise TypeError("pin and value must be ints")

    if pin not in PINS:
        raise RangeError("pin", PINS)

    if value not in DIGITAL_VALUES:
        raise RangeError("value", DIGITAL_VALUES)

    _microbit_send("write_d", [pin, value])
