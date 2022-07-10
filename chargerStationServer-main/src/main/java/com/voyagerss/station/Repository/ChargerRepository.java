package com.voyagerss.station.Repository;

import com.voyagerss.station.Domain.Charger;
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
