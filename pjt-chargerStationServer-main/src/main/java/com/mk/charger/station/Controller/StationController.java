package com.mk.charger.station.Controller;

import com.mk.charger.aop.LogExecutionTime;
import com.mk.charger.station.Domain.Charger;
import com.mk.charger.station.Domain.Station;
import com.mk.charger.station.Dto.StationSearchDto;
import com.mk.charger.station.Repository.ChargerRepository;
import com.mk.charger.station.Repository.StationRepository;
import com.mk.charger.station.Service.StationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.transaction.Transactional;

import static com.mk.charger.ServerApplication.FILE_FOLDER_ROOT_PATH;


@RequestMapping("/station")
@Slf4j
@RestController
class StationController {
	String uploadFolder =
			FILE_FOLDER_ROOT_PATH + "\\" + this.getClass().getAnnotation(RequestMapping.class).value()[0].replace("/", "\\") + "\\";

	@Autowired
	private StationService stationService;
	@Autowired
	StationRepository stationRepository;
	@Autowired
	ChargerRepository chargerRepository;

	@GetMapping
	public ResponseEntity getStationAsPage(@RequestParam StationSearchDto stationSearchDto) throws Exception {
		return new ResponseEntity(stationService.findStationsByLocationAsPage(stationSearchDto), HttpStatus.OK);
	}


	@GetMapping("/{stationid}")
	@Transactional
	@LogExecutionTime
	public  ResponseEntity getOneItDamage(@PathVariable Long stationid) throws Exception {
		return new ResponseEntity(stationRepository.findById(stationid), HttpStatus.OK);
	}

	@GetMapping("/fetch/{stationid}")
	@Transactional
	@LogExecutionTime
	public  ResponseEntity getOneByFetch(@PathVariable Long stationid) throws Exception {
		return new ResponseEntity(stationRepository.findAllJoinFetch(stationid), HttpStatus.OK);
	}


	@GetMapping("/charger/{chargerid}")
	@Transactional
	@LogExecutionTime
	public  ResponseEntity getCharger(@PathVariable Long chargerid) {
		Charger charger = chargerRepository.findById(chargerid).get();
		return new ResponseEntity( charger, HttpStatus.OK);
	}

}
