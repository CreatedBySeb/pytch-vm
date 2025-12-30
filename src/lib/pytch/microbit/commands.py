from ..syscalls import _microbit_send


def show_text(text: str, wait: bool = False, loop: bool = False):
    _microbit_send("show_text", [text, wait, loop])
