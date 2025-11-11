# app/validators/roles.py
ROLES = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["key", "name"],
        "properties": {
            "key": {"bsonType": "string"},
            "name": {"bsonType": "string"},
            "allowedDepartmentIds": {
                "bsonType": ["array", "null"],
                "items": {"bsonType": "objectId"}
            },
            "allDepartments": {"bsonType": ["bool", "null"]},
        }
    }
}

ROLES_INDEXES = [
    (("key", 1), {"unique": True}),
]