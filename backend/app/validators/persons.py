# app/validators/persons.py
PERSONS = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["userId","firstName","lastName","email","birthDate"],
        "properties": {
            "userId": {"bsonType": "objectId"},
            "firstName": {"bsonType": "string"},
            "secondName": {"bsonType": ["string","null"]},
            "lastName": {"bsonType": "string"},
            "secondLastName": {"bsonType": ["string","null"]},
            "email": {"bsonType": "string"},
            "birthDate": {"bsonType": "string"},
            "rut": {"bsonType": ["string","null"]},
            "passportId": {"bsonType": ["string","null"]}
        }
    }
}
PERSONS_INDEXES = [
    (("userId", 1), {"unique": True}),
    (("email", 1),),
]
