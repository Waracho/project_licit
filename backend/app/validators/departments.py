# app/validators/departments.py
DEPARTMENTS = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["name"],
        "properties": {
            "name": {"bsonType": "string", "minLength": 2, "maxLength": 120},
        }
    }
}
DEPARTMENTS_INDEXES = [
    (("name", 1), {"unique": True}),
]
