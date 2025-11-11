# app/validators/chats.py
CHATS = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["bidderUserId", "workerUserId", "status", "unreadBidder", "unreadWorker"],
        "properties": {
            "tenderRequestId": {"bsonType": ["objectId", "null"]},
            "bidderUserId": {"bsonType": "objectId"},
            "workerUserId": {"bsonType": "objectId"},
            "status": {"enum": ["OPEN", "CLOSED"]},
            "unreadBidder": {"bsonType": "int"},
            "unreadWorker": {"bsonType": "int"},
            "lastMessagePreview": {"bsonType": ["string", "null"]},
            "lastMessageAt": {"bsonType": ["date", "null"]},
        }
    }
}
CHATS_INDEXES = [
    (("bidderUserId", 1),),
    (("workerUserId", 1),),
    (("lastMessageAt", -1),),
    (("tenderRequestId", 1),),
]

# app/validators/chat_messages.py
CHAT_MESSAGES = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["chatId","senderUserId","text","createdAt"],
        "properties": {
            "chatId": {"bsonType": "objectId"},
            "senderUserId": {"bsonType": "objectId"},
            "text": {"bsonType": "string"},
            "createdAt": {"bsonType": "date"},
        }
    }
}
CHAT_MESSAGES_INDEXES = [
    (("chatId", 1), ("createdAt", 1)),
]
