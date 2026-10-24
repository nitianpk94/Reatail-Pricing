Open another terminal:

cd client
npm install

Create client/.env:

VITE_API_BASE_URL=http://127.0.0.1:5001/api

Start the frontend:

npm run dev

Open the local URL displayed in the terminal, usually http://localhost:5173.

API Endpoints

Method

Endpoint

Purpose

GET

/api/health

Check API status

POST

/api/pricing/upload

Upload CSV file

GET

/api/pricing

List, search, filter, and paginate records

GET

/api/pricing/:id

Get a record by ID

PUT

/api/pricing/:id

Update a record

For CSV upload, use multipart/form-data with the field name file.

CSV Format

storeId,sku,productName,price,date
STORE001,SKU001,Wireless Mouse,799,2026-10-20


Refer to client/README.md and server/README.md for component-specific instructions.