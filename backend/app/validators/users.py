# app/validators/users.py
USERS = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["rolId","userName","mail","password"],
        "properties": {
            "rolId": {"bsonType": "objectId"},
            "userName": {"bsonType": "string"},
            "mail": {"bsonType": "string"},
            "password": {"bsonType": "string"}
        }
    }
}
USERS_INDEXES = [
    (("mail", 1), {"unique": True}),
    (("rolId", 1),),
    (("userName", 1),),
]
