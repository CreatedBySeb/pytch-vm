import copy
from pytch.syscalls import _effective_source_object, register_sprite_instance


def create_clone_of(original_cls_or_obj):
    """(SPRITE) Create a clone of a SPRITE class or instance

    Two variants, depending on whether the original is a class or an
    instance.  If a class, we clone its instance-0.  If an instance,
    clone that instance.
    """
    obj = _effective_source_object(original_cls_or_obj)
    return create_clone_of_instance(obj)


def create_clone_of_instance(obj):
    new_obj = copy.deepcopy(obj)
    return register_sprite_instance(new_obj, obj)
