# app/validators/tender_requests.py
TENDER_REQUESTS = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "departmentId","createdBy","code","category","status",
            "requiredLevels","currentLevel","createdAt","modifiedAt"
        ],
        "properties": {
            "departmentId": {"bsonType": "objectId"},
            "createdBy":    {"bsonType": "objectId"},
            "code":         {"bsonType": "string"},
            "category":     {"enum": ["ELECTRICAL","WATER","INTERNET"]},
            "status":       {"enum": ["DRAFT","OPEN","IN_REVIEW","AWARDED","CANCELLED"]},
            "requiredLevels":{"bsonType": "int", "minimum": 1},
            "currentLevel": {"bsonType": "int", "minimum": 0},
            "createdAt":    {"bsonType": "date"},
            "modifiedAt":   {"bsonType": "date"},
        }
    }
}

TENDER_REQUESTS_INDEXES = [
    (("departmentId", 1),),
    (("status", 1),),
    # Código único por departamento (misma key puede existir en otro depto)
    (("departmentId", 1), ("code", 1), {"unique": True}),
]
