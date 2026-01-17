from collections import namedtuple
import sys
from types import ModuleType

from ..syscalls import (
    _get_microbit_rev,
)

from .commands import (
    Image,
    _get_var,
    clear_display,
    play_music,
    scroll_text,
    set_pixel,
    show_image,
    show_text,
    stop_music,
    write_digital,
)

from .hat_blocks import (
    when_button_pressed,
    when_gesture_detected,
    when_pin_is_high,
    when_pin_is_low,
    when_sound_level_changes,
)


class Acceleration(namedtuple("Acceleration", ["x", "y", "z"])):
    @property
    def magnitude(self):
        return (self.x**2 + self.y**2 + self.z**2) ** (1 / 2)


class Buttons(namedtuple("Buttons", ["a", "b", "logo"])):
    @property
    def any(self):
        return self.a and self.b and self.logo


class Device(ModuleType):
    @property
    def acceleration(self):
        """Reports the acceleration felt by the micro:bit"""
        values = _get_var("accel")
        return Acceleration(*[float(val) for val in values])

    @property
    def buttons(self):
        """Reports whether any of the buttons on the micro:bit are pressed"""
        values = _get_var("buttons")

        # V1 only provides 2 values, so we just set the logo value to False
        if len(values) < 3:
            values.push(False)

        return Buttons(*[val == "True" for val in values])

    @property
    def gesture(self):
        """Reports the gesture currently detected by the micro:bit"""
        return _get_var("gesture")[0]

    @property
    def light_level(self):
        """Reports the level of light detected by the micro:bit's display"""
        return self._get_int("light")

    @property
    def pins(self):
        """Reports the digital value on each of the micro:bit's pins"""
        return [int(val) for val in _get_var("pins")]

    @property
    def sound_level(self):
        """Reports the level of sound heard by the micro:bit's microphone"""
        if _get_microbit_rev() != 2:
            raise AttributeError()

        return self._get_int("sound")

    @property
    def temperature(self):
        """Reports the temperature felt by the micro:bit in Celsius"""
        return self._get_int("temp")

    @property
    def revision(self):
        """Reports the major revision of the micro:bit, 1 or 2"""
        return _get_microbit_rev()

    def _get_int(self, name: str) -> int:
        return int(_get_var(name)[0])


sys.modules[__name__].__class__ = Device
