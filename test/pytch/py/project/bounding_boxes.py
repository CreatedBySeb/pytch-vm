import pytch
from pytch import Sprite, Project


class SetVis:
    def set_visibility(self, visible):
        if visible:
            self.show()
        else:
            self.hide()


class Square(Sprite, SetVis):
    Costumes = [('square', 'library/images/square-80x80.png', 20, 30)]

    def __init__(self):
        Sprite.__init__(self)
        self.go_to_xy(-50, -90)
        self.switch_costume('square')
        self.show()


class Rectangle(Sprite, SetVis):
    Costumes = [('rectangle', 'library/images/rectangle-60x30.png', 50, 10)]

    def __init__(self):
        Sprite.__init__(self)
        self.go_to_xy(10, -90)
        self.switch_costume('rectangle')
        self.show()


project = Project()
project.register_sprite_class(Square)
project.register_sprite_class(Rectangle)
