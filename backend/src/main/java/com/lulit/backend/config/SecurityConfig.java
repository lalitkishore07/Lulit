package com.lulit.backend.config;

import com.lulit.backend.security.JwtAuthenticationFilter;
import com.lulit.backend.security.OAuth2AuthenticationFailureHandler;
import com.lulit.backend.security.OAuth2AuthenticationSuccessHandler;
import com.lulit.backend.security.UploadRateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final UploadRateLimitFilter uploadRateLimitFilter;
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
        private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;

        @Value("${app.security.cors-origin:http://localhost:5173,http://127.0.0.1:5173}")
        private String corsOrigin;

        /**
         * OAuth2 filter chain — stateful sessions required for the OAuth2 redirect
         * flow.
         * Only matches /oauth2/** and /login/oauth2/** paths.
         */
        @Bean
        @Order(1)
        public SecurityFilterChain oAuth2FilterChain(HttpSecurity http) throws Exception {
                return http
                                .securityMatcher("/oauth2/**", "/login/oauth2/**")
                                .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
                                .cors(Customizer.withDefaults())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                                .oauth2Login(oauth2 -> oauth2
                                                .successHandler(oAuth2AuthenticationSuccessHandler)
                                                .failureHandler(oAuth2AuthenticationFailureHandler))
                                .build();
        }

        /**
         * API filter chain — stateless JWT-based auth for all /api/** routes.
         * CSRF is disabled because the API only uses Bearer tokens in the Authorization
         * header
         * (access tokens are stored in memory, not cookies).
         */
        @Bean
        @Order(2)
        public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
                return http
                                .securityMatcher("/api/**", "/ws/**")
                                .csrf(csrf -> csrf.disable())
                                .cors(Customizer.withDefaults())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/v1/auth/**").permitAll()
                                                .requestMatchers("/api/v1/health").permitAll()
                                                .requestMatchers("/api/v1/dao/proposals",
                                                                "/api/v1/dao/proposals/**")
                                                .permitAll()
                                                .requestMatchers("/api/v1/dao/eligibility/**").permitAll()
                                                .requestMatchers("/api/v1/dao/signature/**").permitAll()
                                                .requestMatchers("/api/v1/dao/auth/**").permitAll()
                                                .requestMatchers("/ws/**").permitAll()
                                                .anyRequest().authenticated())
                                .httpBasic(httpBasic -> httpBasic.disable())
                                .formLogin(form -> form.disable())
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterAfter(uploadRateLimitFilter, JwtAuthenticationFilter.class)
                                .build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                List<String> allowedOrigins = Arrays.stream(corsOrigin.split(","))
                                .map(String::trim)
                                .filter(origin -> !origin.isBlank())
                                .toList();
                configuration.setAllowedOriginPatterns(allowedOrigins);
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
