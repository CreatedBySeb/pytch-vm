from ..hat_blocks import _append_handler


class when_button_pressed:
    "(BUTTON) Run your method when user presses BUTTON on the micro:bit"

    def __init__(self, button):
        self.button = button

    def __call__(self, fun):
        return _append_handler(fun, "microbit", "button:" + self.button)
