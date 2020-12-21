package com.mk.charger.station.Repository;

import com.mk.charger.station.Domain.Charger;
import com.mk.charger.station.Domain.PowerType;
import com.mk.charger.station.Domain.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChargerRepository extends JpaRepository<Charger, Long> {
    List<Charger> findAll();
    @Override
    Optional<Charger> findById(Long id);

    Charger save(Charger charger);

}
