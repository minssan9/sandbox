package com.mk.charger.station.Service;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.mk.charger.station.Domain.Station;
import com.mk.charger.station.Dto.StationSearchDto;
import org.json.simple.parser.ParseException;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.net.URISyntaxException;
import java.util.List;


@Service
public class ChargerServiceImpl implements StationService{
    @Override
    public Page<Station> findStationsByLocationAsPage(StationSearchDto stationSearchDto) {
        return null;
    }

    @Override
    public List<Station> findStationsByLocationAsList(StationSearchDto stationSearchDto) {
        return null;
    }

    @Override
    public Station save(Station station) throws Exception {
        return null;
    }

    @Override
    public Station update(Station station) throws Exception {
        return null;
    }

    @Override
    public List<Station> patchDatabaseFromServer() throws URISyntaxException, JsonProcessingException, ParseException {
        return null;
    }
}
