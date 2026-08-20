"use client";

import { useState } from "react";
import "./Login.css";
import { useRouter } from "next/navigation";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const sendOtp = () => {
    
    setOtpSent(true);
    setMessage("OTP sent successfully");
  };

  const verifyOtp = () => {
    if (otp === "123456") {
      setMessage("Login successful!");
       router.push("/scan");

    
    } else {
      setMessage("Wrong OTP. Use 123456");
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">

        {!otpSent ? (
          <>
            <h1>Welcome Back</h1>

            <p>Enter your phone number to continue</p>

            <label>Phone Number</label>

            <div className="phone-input">
              <span>+91</span>

              <input
                type="tel"
                inputMode="numeric"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>

            <button type="button" onClick={sendOtp}>
              Send OTP
            </button>

            {message && (
              <p className="message">{message}</p>
            )}
          </>
        ) : (
          <>
            <h1>Verify OTP</h1>

            <p>
              Enter the OTP sent to your phone
            </p>

            <label>OTP</label>

            <input
              className="otp-input"
              type="tel"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
              maxLength={6}
            />

            <button type="button" onClick={verifyOtp}>
              Verify OTP
            </button>

            {message && (
              <p className="message">{message}</p>
            )}

            <button
              type="button"
              className="back-button"
         
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setMessage("");
              }}
            >
              Change Number
            </button>
          </>
        )}

      </div>
    </main>
  );
}