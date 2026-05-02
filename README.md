# Project-Medio
An app for finding shortest 2 way distances

# Instructions
1. Copy `backend/.env.example` to `backend/.env` and fill in real local values.
2. Copy `frontend/.env.example` to `frontend/.env` if the frontend needs a non-default API URL.
3. Start the frontend: `cd frontend && npm run dev`
4. Start the backend: `cd backend && npm run dev`
5. Start OTP:
   - Build: `java -Xmx4G -jar otp.jar --build --save otp-data`
   - Run: `java -Xmx4G -jar otp.jar --load otp-data --serve`
