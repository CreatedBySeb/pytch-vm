from ..hat_blocks import _append_handler
from .validation import BUTTONS, GESTURES, PINS, SOUND_LEVELS


class _microbit_hat:
    def __call__(self, fun):
        return _append_handler(fun, "microbit", self.event)


class when_button_pressed(_microbit_hat):
    "(BUTTON) Run your method when user presses BUTTON on the micro:bit"

    def __init__(self, button: str):
        if button not in BUTTONS:
            raise ValueError(f"'{button}' is not a valid button")

        self.event = "button:" + button


class when_gesture_detected(_microbit_hat):
    "(GESTURE) Run your method when GESTURE is detected by the micro:bit"

    def __init__(self, gesture: str):
        if gesture not in GESTURES:
            raise ValueError(f"'{gesture}' is not a valid gesture")

        self.event = "gesture:" + gesture


class when_pin_is_high(_microbit_hat):
    "(PIN) Run your method when the voltage to PIN on the micro:bit is high"

    def __init__(self, pin: int):
        if not isinstance(pin, int):
            raise TypeError("pin must be an int")

        if pin not in PINS:
            raise ValueError(f"'{pin}' is not a valid pin")

        self.event = f"pin_{pin}:high"


class when_pin_is_low(_microbit_hat):
    "(PIN) Run your method when the voltage to PIN on the micro:bit is low"

    def __init__(self, pin: int):
        if not isinstance(pin, int):
            raise TypeError("pin must be an int")

        if pin not in PINS:
            raise ValueError(f"'{pin}' is not a valid pin")

        self.event = f"pin_{pin}:low"


class when_sound_level_changes(_microbit_hat):
    "(LEVEL) Run your method when the sound around the micro:bit is LEVEL"

    def __init__(self, level: str):
        if level not in SOUND_LEVELS:
            raise ValueError(f"'{level}' is not a valid sound level")

        self.event = "sound:" + level
