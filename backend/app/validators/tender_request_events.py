TENDER_REQUEST_EVENTS = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["tenderRequestId","type","actorUserId","at"],
        "properties": {
            "tenderRequestId": {"bsonType": "objectId"},
            "type": {"enum": [
                "CREATED","FILE_ATTACHED","FILE_REMOVED",
                "REVIEW_APPROVED","REVIEW_REJECTED","STATUS_CHANGED"
            ]},
            "actorUserId": {"bsonType": "objectId"},
            "level": {"bsonType": ["int","null"], "minimum": 1},
            "comment": {"bsonType": ["string","null"]},
            "metadata": {"bsonType": ["object","null"]},
            "at": {"bsonType": "date"}
        }
    }
}
TENDER_REQUEST_EVENTS_INDEXES = [
    (("tenderRequestId",1),("at",-1)),
    (("type",1),("tenderRequestId",1)),
]
