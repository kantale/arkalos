from .arkalos_common import register
from .arkalos_common import loginlocal as login
from .arkalos_common import logoutlocal as logout

from .arkalos_common import add_reference, get_references

__all__ = [
	register, login, logout, # Basics
	add_reference, get_references # References
]

