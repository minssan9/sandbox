package com.mk.charger.station.Controller;

import com.mk.charger.station.Domain.Station;
import com.mk.charger.station.Dto.StationSearchDto;
import com.mk.charger.station.Repository.StationRepository;
import com.mk.charger.station.Service.StationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.mk.charger.ServerApplication.FILE_FOLDER_ROOT_PATH;


@RequestMapping("/station")
@Slf4j
@RestController
class StationController {
	String uploadFolder =
			FILE_FOLDER_ROOT_PATH + "\\" + this.getClass().getAnnotation(RequestMapping.class).value()[0].replace("/", "\\") + "\\";

	@Autowired
	private StationService stationService;


	@GetMapping
	public ResponseEntity getStationAsPage(@RequestParam StationSearchDto stationSearchDto) throws Exception {
		return new ResponseEntity(stationService.findStationsByLocationAsPage(stationSearchDto), HttpStatus.OK);
	}


	@GetMapping("/{stationid}")
	public  ResponseEntity getOneItDamage(@PathVariable String stationid) throws Exception {
		return new ResponseEntity("..", HttpStatus.OK);
//		itDamageRepo.findByRtime("SEOHAN", rtime)
	}


}
