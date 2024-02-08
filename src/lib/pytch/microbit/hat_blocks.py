from ..hat_blocks import _append_handler

class when_button_pressed:
    "(BUTTON) Run your method when you press BUTTON on the micro:bit"
    def __init__(self, button):
        microbit_buttons = ("a", "b", "logo")

        if button not in microbit_buttons:
            raise TypeError("Button '" + button + "' is not one of the supported buttons: " + ", ".join(microbit_buttons))

        self.button = button

    def __call__(self, fun):
        return _append_handler(fun, 'microbit', "button:" + self.button)

class when_gesture_performed:
    "(GESTURE) Run your method when the micro:bit is GESTURE "
    def __init__(self, gesture):
        microbit_gestures = ("down", "face down", "face up", "left", "right", "shake", "up")

        if gesture not in microbit_gestures:
            raise TypeError("Button '" + gesture + "' is not one of the supported gestures: " + ", ".join(microbit_gestures))

        self.gesture = gesture

    def __call__(self, fun):
        return _append_handler(fun, 'microbit', "gesture:" + self.gesture)

class when_pin_high:
    "(PIN) Run your method when you PIN is high on the micro:bit"
    def __init__(self, pin):
        microbit_pins = range(0, 3)

        if pin not in microbit_pins:
            raise TypeError("Pin '" + str(pin) + "' is not one of the supported pins: " + ", ".join(microbit_pins))

        self.pin = str(pin)

    def __call__(self, fun):
        return _append_handler(fun, 'microbit', "pin_high:" + self.pin)

class when_sound_heard:
    "(LEVEL) Run your method when a LEVEL sound is head"
    def __init__(self, level):
        noise_levels = ("quiet", "loud")

        if level not in noise_levels:
            raise TypeError("Level '" + level + "' is not one of the supported levels: " + ", ".join(noise_levels))

        self.level = level

    def __call__(self, fun):
        return _append_handler(fun, 'microbit', "mic:" + self.level)
