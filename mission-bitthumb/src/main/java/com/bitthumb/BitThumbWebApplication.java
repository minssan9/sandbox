package com.bitthumb;

import com.bitthumb.auth.Domain.Account;
import com.bitthumb.auth.Service.AccountService;
//import com.bitthumb.config.SwaggerConfig;
import io.swagger.annotations.ApiModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.PropertySource;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;

import java.time.format.DateTimeFormatter;

@SpringBootApplication
@Configuration
@CrossOrigin(origins = {"http://localhost"})
//@Import(SwaggerConfig.class)
public class BitThumbWebApplication extends  WebMvcConfigurationSupport {
    @Autowired
    AccountService accountService;

	@Bean
    PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

    public static void main(String[] args) {
        SpringApplication.run(BitThumbWebApplication.class, args);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("swagger-ui.html")
                .addResourceLocations("classpath:/META-INF/resources/");

        registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/");
    }


    @Bean
    public ApplicationRunner applicationRunner() {
        return new ApplicationRunner() {
            @Override
            public void run(ApplicationArguments args) throws Exception {

//                Account account1 = Account.builder()
//                        .loginId("minssan9@gmail.com")
//                        .name("민상훈")
//                        .password("1234")
//                        .build();
//
//                accountService.createAccount(account1);
            }
        };
    }
}
