# Python Coding Style Guide

## Philosophy

Write code that is easy to read without external explanation.

Prefer clear names, simple control flow, and explicit types over comments, cleverness, or excessive abstraction.

Code should communicate intent directly.

---

# The Zen of Python

Follow the spirit of the Zen of Python:

> Beautiful is better than ugly.
> Explicit is better than implicit.
> Simple is better than complex.
> Complex is better than complicated.
> Flat is better than nested.
> Sparse is better than dense.
> Readability counts.
> Special cases aren't special enough to break the rules.
> Although practicality beats purity.
> Errors should never pass silently.
> Unless explicitly silenced.
> In the face of ambiguity, refuse the temptation to guess.
> There should be one-- and preferably only one --obvious way to do it.
> Now is better than never.
> Although never is often better than *right* now.
> If the implementation is hard to explain, it's a bad idea.
> If the implementation is easy to explain, it may be a good idea.

---

# Naming

## Use names that describe intent

Good:

```python
user_by_id: dict[str, User]
retry_count: int
expires_at: datetime
```

Bad:

```python
d
x
tmp
obj
```

## Avoid unnecessary abbreviations

Good:

```python
customer_email
request_timeout_seconds
```

Bad:

```python
cust_eml
req_timeout_secs
```

## Include units when relevant

Good:

```python
timeout_seconds
size_bytes
```

Bad:

```python
timeout
size
```

---

# Type Hints

Use type hints everywhere practical.

Good:

```python
def load_user(user_id: str) -> User:
    ...
```

Good:

```python
items: list[Order]
```

Avoid:

```python
def load_user(user_id):
    ...
```

Types reduce ambiguity and eliminate many comments.

Since you are using python 3.12, avoid using Typing library when you have a native way to do it (e.g. list instead of typing.List).

---

# Functions

## Keep functions focused

A function should do one thing at one level of abstraction.

Good:

```python
def parse_timestamp(value: str) -> datetime:
    ...
```

Bad:

```python
def process_everything(data):
    ...
```

## Prefer returning early

Good:

```python
def get_email(user: User) -> str:
    if user.email is None:
        raise ValueError("User has no email")

    return user.email
```

Avoid deep nesting.

Bad:

```python
def get_email(user: User) -> str:
    if user.email is not None:
        return user.email
    else:
        raise ValueError("User has no email")
```

## Keep parameters manageable

If a function requires many parameters, reconsider the API.

---

# Comments

## Comments are a last resort

If code requires a comment to explain what it does, improve the code first.

Bad:

```python
# Increment retry count
retry_count += 1
```

Bad:

```python
# Get user
user = load_user(user_id)
```

## Comment intent, not mechanics

Good:

```python
# External API occasionally returns malformed timestamps.
```

Good:

```python
# Must remain stable for backward compatibility.
```

---

# Docstrings

## Default to no docstring

Do not write docstrings that merely repeat the signature.

Bad:

```python
def load_user(user_id: str) -> User:
    """Loads a user by user id."""
```

## Add docstrings only when they provide information that code cannot

Good:

```python
def normalize_price(value: Decimal) -> Decimal:
    """
    Rounds according to accounting rules used by the billing service.
    """
```

Keep docstrings short.

---

# Conditionals

Prefer positive conditions.

Good:

```python
if user.is_active:
    ...
```

Less clear:

```python
if not user.is_disabled:
    ...
```

Avoid complex boolean expressions when a named variable improves clarity.

Good:

```python
is_expired = expires_at < now

if is_expired:
    ...
```

---

# Exceptions

Raise specific exceptions.

Good:

```python
raise ValueError("Invalid timestamp format")
```

Avoid:

```python
raise Exception("Something went wrong")
```

Never silently swallow exceptions without a reason.

Bad:

```python
try:
    ...
except Exception:
    pass
```

---

# Collections

Prefer direct expressions over unnecessary loops.

Good:

```python
emails = [user.email for user in users]
```

Good:

```python
active_users = [user for user in users if user.is_active]
```

Avoid deeply nested comprehensions.

When readability suffers, use a loop.

---

# Strings

Prefer f-strings.

Good:

```python
message = f"User {user_id} not found"
```

Avoid:

```python
message = "User %s not found" % user_id
```

---

# Constants

Replace unexplained literals with named constants.

Good:

```python
MAX_RETRY_ATTEMPTS = 3
```

Bad:

```python
if retry_count > 3:
    ...
```

---

# Readability Checklist

Before finalizing code, ask:

* Can a reader understand this without comments?
* Are names specific and unambiguous?
* Are types obvious from annotations?
* Is nesting shallow?
* Are exceptions explicit?
* Is every abstraction earning its existence?
* Can any code be removed without losing clarity?

If removing code improves readability, remove it.
