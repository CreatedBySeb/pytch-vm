import pytch
from pytch import Sprite, Project


class Square(Sprite):
    Costumes = [('square', 'library/images/square-80x80.png', 20, 30)]

    def __init__(self):
        Sprite.__init__(self)
        self.go_to_xy(-50, -90)
        self.switch_costume('square')
        self.show()


class Rectangle(Sprite):
    Costumes = [('rectangle', 'library/images/rectangle-60x30.png', 50, 10)]

    def __init__(self):
        Sprite.__init__(self)
        self.go_to_xy(10, -90)
        self.switch_costume('rectangle')
        self.show()


project = Project()
project.register_sprite_class(Square)
project.register_sprite_class(Rectangle)
