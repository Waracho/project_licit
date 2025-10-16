REQUEST_FILES = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["tenderRequestId", "url", "createdAt"],
        "properties": {
            "tenderRequestId": {"bsonType": "objectId"},
            "url":           {"bsonType": "string"},
            "fileName":      {"bsonType": ["string", "null"]},
            "contentType":   {"bsonType": ["string", "null"]},
            "size":          {"bsonType": ["int", "null"], "minimum": 0},
            "uploadedBy":    {"bsonType": ["objectId", "null"]},
            "createdAt":     {"bsonType": "date"},
        }
    }
}
REQUEST_FILES_INDEXES = [
    (("tenderRequestId", 1), ("createdAt", -1)),
]
