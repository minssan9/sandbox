package com.voyagerss.station.Repository;


import com.voyagerss.station.Domain.PowerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PowerTypeRepository extends JpaRepository<PowerType, Long> {
	List<PowerType> findAll();

	@Override
	Optional<PowerType> findById(Long id);

	PowerType save(PowerType powerType);
}
