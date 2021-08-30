package com.mk.charger.station.Service;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.mk.charger.aop.LogExecutionTime;
import com.mk.charger.station.Domain.Charger;
import com.mk.charger.station.Domain.Station;
import com.mk.charger.station.Dto.StationSearchDto;
import com.mk.charger.station.Repository.ChargerRepository;
import org.json.simple.parser.ParseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;

import java.net.URISyntaxException;
import java.util.List;


@Service
public class ChargerServiceImpl implements APIService<Charger> {

    @Autowired
    private ChargerRepository chargerRepository;

    @Override
    @LogExecutionTime
    public Charger save(Charger entity) {
        return null;
    }

    @Override
    @LogExecutionTime
    public List<Charger> findAll() {
        return chargerRepository.findAll();
    }
}
