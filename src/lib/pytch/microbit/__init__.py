from collections import namedtuple

from ..syscalls import (
    _is_microbit_v2,
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


def __getattr__(name: str):
    # Special handling for variables which allows us to represent them as
    # attributes even though they require a function call

    if name == "acceleration":
        values = _get_var("accel")
        return Acceleration(*[float(val) for val in values])

    if name == "buttons":
        values = _get_var("buttons")

        # V1 only provides 2 values, so we just set the logo value to False
        if len(values) < 3:
            values.push(False)

        return Buttons(*[val == "True" for val in values])

    if name == "gesture":
        # String representing gesture type
        return _get_var("gesture")[0]

    if name == "light_level":
        # 0 - 255
        return int(_get_var("light")[0])

    if name == "pins":
        # Array of integer values, 0 for low, 1 for high
        return [int(val) for val in _get_var("pins")]

    if name == "sound_level":
        if not _is_microbit_v2():
            raise AttributeError()

        # 0 - 255, V2 only
        return int(_get_var("sound")[0])

    if name == "temperature":
        return int(_get_var("temp")[0])

    raise AttributeError()
