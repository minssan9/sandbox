package com.voyagerss.station.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.voyagerss.station.Domain.Station;
import com.voyagerss.station.Dto.StationSearchDto;
import org.json.simple.parser.ParseException;
import org.springframework.data.domain.Page;

import java.net.URISyntaxException;
import java.util.List;

public interface StationService {
	Page<Station> findStationsByLocationAsPage(StationSearchDto stationSearchDto);
	List<Station> findStationsByLocationAsList(StationSearchDto stationSearchDto);
	Station save(Station station) throws Exception;
	Station update(Station station) throws Exception;

	List<Station>  patchDatabaseFromServer() throws URISyntaxException, JsonProcessingException, ParseException;
}
