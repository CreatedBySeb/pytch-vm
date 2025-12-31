BRIGHTNESS = range(0, 10)
BUTTONS = ("a", "b", "logo")
DIGITAL_VALUES = range(0, 2)

GESTURES = (
    "up",
    "down",
    "left",
    "right",
    "face up",
    "face down",
    "freefall",
    "3g",
    "6g",
    "8g",
    "shake",
)

PINS = range(0, 3)
PIXELS = range(0, 5)
SOUND_LEVELS = ("loud", "quiet")


class RangeError(ValueError):
    def __init__(self, name: str, range: range):
        end = range.stop - range.step
        super().__init__(f"{name} must be between {range.start} and {end}")
