import shlex
config = '--psm 6 -c "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$. /\'-"'
print(shlex.split(config))
