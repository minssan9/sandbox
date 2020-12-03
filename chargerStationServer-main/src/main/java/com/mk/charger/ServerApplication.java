package com.mk.charger;

import com.mk.charger.station.Service.StationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;


@SpringBootApplication
@EnableScheduling
@Configuration
@PropertySource(value = {"classpath:account.properties"})
@CrossOrigin(origins = {"*", "http://localhost"})
public class ServerApplication {
	public static DateTimeFormatter dateFormatString = DateTimeFormatter.ofPattern("yyyyMMdd");
	public static DateTimeFormatter timeFormatString = DateTimeFormatter.ofPattern("HHmm");

	public static DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd");
	public static DateTimeFormatter timeFormat = DateTimeFormatter.ofPattern("HH:mm");

	@Autowired
	StationService stationService;

	@Value("${file.upload-dir}")
    public static String FILE_FOLDER_ROOT_PATH;

	public static void main(String[] args) {
		SpringApplication.run(ServerApplication.class, args);
	}

	@Bean
	public ApplicationRunner applicationRunner() {
		return new ApplicationRunner() {
			@Override
			public void run(ApplicationArguments args) throws Exception {
				LocalDateTime oldDateTime = LocalDateTime.now().minusDays(150);

				stationService.patchDatabaseFromServer();
			}
		};
	}

}
