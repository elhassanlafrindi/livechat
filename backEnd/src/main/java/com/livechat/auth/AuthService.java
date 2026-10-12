package com.livechat.auth;

import com.livechat.auth.dto.AuthResponse;
import com.livechat.auth.dto.LoginRequest;
import com.livechat.auth.dto.RegisterRequest;
import com.livechat.common.exception.BadRequestException;
import com.livechat.common.exception.UnauthorizedException;
import com.livechat.user.User;
import com.livechat.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request == null || request.email() == null || request.email().isBlank()
                || !EMAIL_PATTERN.matcher(request.email().trim()).matches()) {
            throw new BadRequestException("Invalid email format");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Email already used");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordHash)
                .build();

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(savedUser);

        return new AuthResponse(token, savedUser.getId(), savedUser.getEmail());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        if (request == null || request.email() == null || request.password() == null) {
            throw new UnauthorizedException("Invalid credentials");
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
}
