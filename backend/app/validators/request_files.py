# app/validators/request_files.py
REQUEST_FILES = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["tenderRequestId", "s3Key", "createdAt"],
        "properties": {
            "tenderRequestId": {"bsonType": "objectId"},
            "s3Key":         {"bsonType": "string"},
            "bucket":        {"bsonType": ["string", "null"]},
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
    (("s3Key", 1),),   # útil para búsquedas directas
]
