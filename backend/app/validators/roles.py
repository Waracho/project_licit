# app/validators/roles.py
ROLES = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["key","name"],
        "properties": {
            "key": {"enum": ["BIDDER","ADMIN","WORKER"]},
            "name": {"bsonType": "string", "minLength": 2, "maxLength": 60}
        }
    }
}
ROLES_INDEXES = [
    (("key", 1), {"unique": True}),
    (("name", 1), {"unique": True}),
]
