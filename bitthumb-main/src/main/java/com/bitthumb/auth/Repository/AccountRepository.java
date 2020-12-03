package com.bitthumb.auth.Repository;

import com.bitthumb.auth.Domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByLoginId(String loginId);
    Optional<Account> findByToken(String token);
}
