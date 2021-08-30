package com.mk.charger.station.Controller;

import com.mk.charger.station.Dto.StationSearchDto;
import com.mk.charger.station.Service.StationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.mk.charger.ServerApplication.FILE_FOLDER_ROOT_PATH;


@RequestMapping("/station/util")
@Slf4j
@RestController
class StationFunctionController {
	String uploadFolder =
			FILE_FOLDER_ROOT_PATH + "\\" + this.getClass().getAnnotation(RequestMapping.class).value()[0].replace("/", "\\") + "\\";

	@Qualifier("stationServiceImpl")
	@Autowired
	private StationService stationService;

	@GetMapping("page")
	public ResponseEntity getStationAsList(@RequestParam StationSearchDto stationSearchDto, Pageable pageable) throws Exception {
		return new ResponseEntity(stationService.findStationsByLocationAsList(stationSearchDto), HttpStatus.OK);
	}

	@PostMapping("update")
	public ResponseEntity updateStationsFromGov() throws Exception {
		return new ResponseEntity(stationService.patchDatabaseFromServer(), HttpStatus.OK);
	}
}
