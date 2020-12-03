package com.bitthumb.auth.Controller;


import com.bitthumb.auth.Domain.Account;
import com.bitthumb.auth.Dto.AccountDto;
import com.bitthumb.auth.Repository.AccountRepository;
import com.bitthumb.auth.Service.AccountService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Description;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RequestMapping("/v1/member")
@Slf4j
@RestController
class AccountController {

	@Autowired
	private AccountService accountService;

	@Autowired
	private AccountRepository accountRepository;

	@PostMapping("join")
	@Description("회원가입")
	public ResponseEntity<Account> createAccount(@RequestBody Account account) {

		Optional<Account> byAccountId = accountRepository.findByLoginId(account.getLoginId());

		// 이미 존재하는 아이디
		if (byAccountId.isPresent()) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		Account savedAccount = accountService.createAccount(account);
		return new ResponseEntity<>(savedAccount, HttpStatus.OK);
	}

    @PostMapping("login")
	@ResponseBody
    public ResponseEntity signin(@RequestBody AccountDto accountDto){
		Account account = new Account(accountDto);
		String token =  accountService.login(account);
        HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.set("Authorization", token);
		return new ResponseEntity(token, responseHeaders, HttpStatus.OK);
    }

	@GetMapping("info")
	@Description("로그인 사용자 정보가져오기")
	public ResponseEntity getAccount(@RequestParam String token) throws Exception {
		return new ResponseEntity(accountService.info(token), HttpStatus.OK);
	}
}
