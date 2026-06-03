curl -i -X POST \
  https://graph.facebook.com/v22.0/1069976482856586/messages \
  -H 'Authorization: Bearer <access token>' \
  -H 'Content-Type: application/json' \
  -d '{ "messaging_product": "whatsapp", "to": "", "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }'



# Create Autonomous WhatsApp Agent Service for navyaai.com



when business automation services, create a way to send messages to targets with required content through API. also recevive messages and autonomously reply and call specified apis to update zoho fields e.t.c