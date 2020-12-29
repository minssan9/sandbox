package com.voyagerss.station.Service;


import com.voyagerss.aop.LogExecutionTime;
import com.voyagerss.station.Domain.Charger;
import com.voyagerss.station.Repository.ChargerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
