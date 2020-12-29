package com.voyagerss.station.Repository;


import com.voyagerss.station.Domain.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {
	List<Station> findAll();

	@Override
	Optional<Station> findById(Long id);

	@Query("select distinct a from Station a join fetch a.chargers c join fetch c.powerType p " +
			"where a.id = :id")
	List<Station> findAllJoinFetch(@Param("id") Long id);


	Station findByStatId(String statId);
	Station save(Station station);
}
