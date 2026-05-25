using System;

namespace backend.Models
{
    public class User
    {
        public int Id { get; private set; }
        public string Username { get; private set; } = "";
        public string Email { get; private set; } = "";
        public string PasswordHash { get; private set; } = ""; // Simple plaintext hash for demo

        private User() { } // For EF Core

        public User(string username, string email, string passwordHash)
        {
            if (string.IsNullOrWhiteSpace(username))
                throw new ArgumentException("Username cannot be empty", nameof(username));
            if (string.IsNullOrWhiteSpace(passwordHash))
                throw new ArgumentException("Password hash cannot be empty", nameof(passwordHash));

            Username = username;
            Email = email ?? "";
            PasswordHash = passwordHash;
        }

        public bool VerifyPassword(string password)
        {
            return PasswordHash == password;
        }

        public void UpdateEmail(string newEmail)
        {
            Email = newEmail ?? "";
        }
    }
}
