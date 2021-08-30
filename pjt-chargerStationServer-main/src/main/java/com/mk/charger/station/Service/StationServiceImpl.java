package com.mk.charger.station.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mk.charger.station.Domain.Station;
import com.mk.charger.station.Dto.StationSearchDto;
import com.mk.charger.station.Repository.StationRepository;
import lombok.extern.slf4j.Slf4j;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.transaction.Transactional;
import java.net.URISyntaxException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static com.mk.charger.ServerApplication.dateFormatString;
import static com.mk.charger.ServerApplication.timeFormatString;

@Service
@Slf4j
public class StationServiceImpl implements StationService {

    @Autowired
	StationRepository stationRepository;

    @Override
	@Transactional
	public Station update(Station station) throws Exception {
		String nowDate =  LocalDateTime.now().format(dateFormatString);
		String nowTime = LocalDateTime.now().format(timeFormatString);

		Station updateStation = stationRepository.findById(station.getId()).get();
		updateStation.setStatUpdDt(nowDate + nowTime);
		updateStation.setStat(9);

		return updateStation;
	}

	@Override
	public List<Station> patchDatabaseFromServer() throws URISyntaxException, JsonProcessingException, ParseException {
		String serviceKey =  "dKNTmNiGHpcJLrC4HIJc3nW4AaPPKOQLCvlzV7IQZDTTztv6PTuDusZxS8iC1vpBEtkLsnk97WEzKpEvf3Zqgg==";
		String urlString = ("http://open.ev.or.kr:8080/openapi/services/EvCharger/getChargerInfo");

		for(int i = 1; i < 2; i++){
			urlString = ("http://open.ev.or.kr:8080/openapi/services/EvCharger/getChargerInfo?serviceKey="+ serviceKey + "&pageNo=" + i + "&pageSize=10");
			getStationInfoFromGov(urlString);
		}
		return null;
	}


	private void getStationInfoFromGov(String urlString) throws ParseException, JsonProcessingException {
		RestTemplate restTemplate = new RestTemplate();
		// 오브젝트로 결과값 받아오기
		HttpHeaders headers = new HttpHeaders();
		HttpEntity entity = new HttpEntity("parameters", headers);
		JSONParser parser = new JSONParser();

		ResponseEntity<String> response  = restTemplate.exchange(urlString, HttpMethod.GET, entity, String.class);


		JSONObject jsonObj = (JSONObject)parser.parse( response.getBody() );
		String itemsJSON = jsonObj.get("items").toString();

		JSONArray itemsJSONArray = (JSONArray) parser.parse(itemsJSON);
		JSONObject itemsJSONObject = (JSONObject) itemsJSONArray.get(0);
		JSONArray items = (JSONArray) itemsJSONObject.get("item");


		List<Station> stations = new ArrayList<>();

		for (Object obj: items) {
			ObjectMapper m = new ObjectMapper();
			Station station= m.readValue(obj.toString(), Station.class);
//			stations.add(station);
//			stationRepository.findByStatId(station.getStatId())
//					.orElseThrow(()->{
//						stationRepository.save(station);
//					});
			if ( stationRepository.findByStatId(station.getStatId())== null){
				stationRepository.save(station);
			}
		}
	}

	@Override
	public Page<Station> findStationsByLocationAsPage(StationSearchDto stationSearchDto) {
//		stationRepository.findBy
		return null;
	}

	@Override
	public List<Station> findStationsByLocationAsList(StationSearchDto stationSearchDto) {
		return null;
	}



	@Override
	public Station save(Station station) throws Exception {
		String nowDate =  LocalDateTime.now().format(dateFormatString);
		String nowTime = LocalDateTime.now().format(timeFormatString);

		return stationRepository.save(station);
	}
}
