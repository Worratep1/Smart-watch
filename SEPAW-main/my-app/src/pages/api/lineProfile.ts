
import { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server'
import axios from "axios";
import prisma from '@/lib/prisma'
import { replyMessage, replyRegistration, replyUserData, replyNotRegistration, replyMenuBorrowequipment, replyConnection, replyLocation, replySetting, replyUserInfo, replyNotification } from '@/utils/apiLineReply';
import { encrypt, parseQueryString } from '@/utils/helpers'
import { postbackSafezone, postbackAccept, postbackClose } from '@/lib/lineFunction'
import * as api from '@/lib/listAPI'

type Data = {
	message: string;
	data?: any;
}
const getUser = async (userId: string) => {
	const responseUser = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUser/${userId}`);
	if(responseUser.data?.data){
		return responseUser.data.data
	}else{
		return null
	}
}
const getGroupLine = async (groupId: string) => {
	const response = await axios.get(`${process.env.WEB_DOMAIN}/api/master/getGroupLine?group_line_id=${groupId}`);
	if(response.data?.data){
		return response.data.data
	}else{
		return null
	}
}
const addGroupLine = async (groupId: string) => {
	const response = await axios.post(`${process.env.WEB_DOMAIN}/api/master/getGroupLine`, { group_line_id: groupId, group_name: '' });
	if(response.data?.id){
		return response.data.id
	}else{
		return null
	}
}

const getUserTakecareperson = async (userId: string) => {
	const responseUser = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUserTakecareperson/${userId}`);
	if(responseUser.data?.data){
		return responseUser.data.data
	}else{
		return null
	}
}
const getSafezone = async (takecare_id: number, users_id: number) => {
	const response = await axios.get(`${process.env.WEB_DOMAIN}/api/setting/getSafezone?takecare_id=${takecare_id}&users_id=${users_id}`);
	if(response.data?.data){
		return response.data.data
	}else{
		return null
	}
}
const getLocation = async (takecare_id: number, users_id: number, safezone_id:number) => {
	const response = await axios.get(`${process.env.WEB_DOMAIN}/api/location/getLocation?takecare_id=${takecare_id}&users_id=${users_id}&safezone_id=${safezone_id}`);
	if(response.data?.data){
		return response.data.data
	}else{
		return null
	}
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'POST') {
		try {
			if(req.body.events[0]){
				const events = req.body.events[0]

				const replyToken = events.replyToken

				const userId = events.source.userId
				
				if(events.type === "message" && events.source.type === "user"){
					
					if(events.message.type === "text"){
						if(events.message.text === "ลงทะเบียน"){
							const responseUser = await api.getUser(userId);
							if(responseUser){
								await replyUserData({replyToken, userData : responseUser})
							}else{
								await replyRegistration({replyToken, userId})
							}
						} else if (events.message.text === "การยืม การคืนครุภัณฑ์") {
							const responseUser = await api.getUser(userId);
							if(responseUser){
								await replyMenuBorrowequipment({replyToken, userData : responseUser})
							}else{
								await replyNotRegistration({replyToken, userId})
							}
						}else if(events.message.text ===  "การเชื่อมต่อนาฬิกา"){
							const responseUser = await api.getUser(userId);
							if(responseUser){
								const encodedUsersId = encrypt(responseUser.users_id.toString());
								const responseUserTakecareperson = await getUserTakecareperson(encodedUsersId);
								if(responseUserTakecareperson){
									await replyConnection({replyToken, userData : responseUser, userTakecarepersonData: responseUserTakecareperson})
								}else{
									await replyMessage({ replyToken: req.body.events[0].replyToken, message: 'ยังไม่ได้เพิ่มข้อมูลผู้สูงอายุไม่สามารถเชื่อมต่อนาฬิกาได้' })
								}
								
							}else{
								await replyNotRegistration({replyToken, userId})
							}
						}else if(events.message.text ===  "ดูตำแหน่งปัจจุบัน"){
							const responseUser = await api.getUser(userId);
							if(responseUser){
								const encodedUsersId = encrypt(responseUser.users_id.toString());
								const responseUserTakecareperson = await getUserTakecareperson(encodedUsersId);
								if(responseUserTakecareperson){
									const responeSafezone = await getSafezone(responseUserTakecareperson.takecare_id, responseUser.users_id);
									if(responeSafezone){
										const responeLocation = await getLocation(responseUserTakecareperson.takecare_id, responseUser.users_id, responeSafezone.safezone_id)
										await replyLocation({replyToken, userData : responseUser, userTakecarepersonData : responseUserTakecareperson, safezoneData : responeSafezone, locationData : responeLocation})
									}else{
										await replyMessage({ replyToken: req.body.events[0].replyToken, message: 'ยังไม่ได้ตั้งค่าเขตปลอดภัยไม่สามารถดูตำแหน่งปัจจุบันได้' })
									}
								}else{
									await replyMessage({ replyToken: req.body.events[0].replyToken, message: 'ยังไม่ได้เพิ่มข้อมูลผู้สูงอายุไม่สามารถดูตำแหน่งปัจจุบันได้' })
								}

							}else{
								await replyNotRegistration({replyToken, userId})
							}
						}else if(events.message.text ===  "ตั้งค่าเขตปลอดภัย"){
							const responseUser = await api.getUser(userId);
							if(responseUser){
								const encodedUsersId = encrypt(responseUser.users_id.toString());
								const responseUserTakecareperson = await getUserTakecareperson(encodedUsersId);
								if(responseUserTakecareperson){
									const responeSafezone = await getSafezone(responseUserTakecareperson.takecare_id, responseUser.users_id);
									await replySetting({replyToken, userData : responseUser, userTakecarepersonData : responseUserTakecareperson, safezoneData : responeSafezone})
								}else{
									await replyMessage({ replyToken: req.body.events[0].replyToken, message: 'ยังไม่ได้เพิ่มข้อมูลผู้สูงอายุไม่สามารถตั้งค่าเขตปลอดภัยได้' })
								}
							}else{
								await replyNotRegistration({replyToken, userId})
							}
						}else if(events.message.text ===  "ข้อมูลผู้ใช้งาน"){
							const responseUser = await api.getUser(userId);
							if(responseUser){
								const encodedUsersId = encrypt(responseUser.users_id.toString());
								const responseUserTakecareperson = await getUserTakecareperson(encodedUsersId);
								await replyUserInfo({replyToken, userData : responseUser, userTakecarepersonData : responseUserTakecareperson})
							}else{
								await replyNotRegistration({replyToken, userId})
							}
						}
					}
				}

				if(events.source.type === "group" && events.type === "join"){
				
					const groupLine = await getGroupLine(events.source.groupId);
					if(!groupLine){
						await addGroupLine(events.source.groupId)
					}
				}

				if(events.type === "postback" && events.postback?.data){
					const postback = parseQueryString(events.postback.data)
				
					if(postback.type === 'safezone'){
						const replyToken = await postbackSafezone({ userLineId: postback.userLineId, takecarepersonId: Number(postback.takecarepersonId) })
						if(replyToken){
							await replyNotification({ replyToken, message: 'ส่งคำขอความช่วยเหลือแล้ว' })
						}
					}else if(postback.type === 'accept'){
						let data = postback
						data.groupId = events.source.groupId
						data.userIdAccept = events.source.userId
						const replyToken = await postbackAccept(data)
						if(replyToken){
							await replyNotification({ replyToken, message: 'ตอบรับเคสขอความช่วยเหลือแล้ว' })
						}
					}else if(postback.type === 'close'){
						let data = postback
						data.groupId = events.source.groupId
						data.userIdAccept = events.source.userId
						const replyToken = await postbackClose(data)
						if(replyToken){
							await replyNotification({ replyToken, message: 'ปิดเคสขอความช่วยเหลือแล้ว' })
						}
					}
				}
				
				
			}
	
		} catch (error) {
			return await replyMessage({ replyToken: req.body.events[0].replyToken, message: 'ระบบขัดข้องกรุณาลองใหม่อีกครั้ง' })
		}
		return res.status(200).json({ message: 'success'})
	}else{
		res.setHeader('Allow', ['POST'])
		res.status(405).json({ message: `วิธี ${req.method} ไม่อนุญาต` })
	}
	
}
