package com.mk.charger.station.Repository;


import com.mk.charger.station.Domain.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {
	List<Station> findAll();

	@Override
	Optional<Station> findById(Long id);

	Station findByStatId(String statId);
}
