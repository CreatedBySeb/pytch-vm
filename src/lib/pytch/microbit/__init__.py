from collections import namedtuple

from .commands import (
    _get_var,
    show_text,
)

from .hat_blocks import (
    when_button_pressed,
)


class Acceleration(namedtuple("Acceleration", ["x", "y", "z"])):
    @property
    def magnitude(self):
        return (self.x**2 + self.y**2 + self.z**2) ** (1 / 2)


def __getattr__(name: str):
    # Special handling for variables which allows us to represent them as
    # attributes even though they require a function call

    if name == "acceleration":
        values = _get_var("accel")
        return Acceleration(*[float(val) for val in values])

    raise AttributeError()
